/* global describe, it, expect, jest, beforeEach, afterEach */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import useIdleSignOut, { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '../../useIdleSignOut';
import IdleWarningDialog from '../../../components/IdleWarningDialog';
import { clearAccessToken, getLastActivity, markActivity } from '../../tabSession';

const MIN = 60 * 1000;
const advance = (ms) => act(() => { jest.advanceTimersByTime(ms); });
const start = (props = {}) => {
  const onIdle = jest.fn();
  const view = renderHook((p) => useIdleSignOut({ enabled: true, onIdle, ...p }), { initialProps: props });
  advance(0);
  return { onIdle, ...view };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-12T10:00:00'));
  sessionStorage.clear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useIdleSignOut', () => {
  it('warns 2 minutes before and signs out after 30 minutes without input', () => {
    const { onIdle, result } = start();
    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS - 1000);
    expect(result.current.warningDeadline).toBeNull();

    advance(1000);
    expect(result.current.warningDeadline).toBe(Date.now() + IDLE_WARNING_MS);
    expect(onIdle).not.toHaveBeenCalled();

    advance(IDLE_WARNING_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.warningDeadline).toBeNull();
  });

  it('user input pushes the sign-out back', () => {
    const { onIdle, result } = start();
    advance(20 * MIN);
    fireEvent.pointerMove(window);
    advance(20 * MIN);
    expect(result.current.warningDeadline).toBeNull();
    fireEvent.keyDown(window, { key: 'a' });
    advance(29 * MIN);
    expect(onIdle).not.toHaveBeenCalled();
    advance(1 * MIN);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('background requests and timers alone do not count as activity', () => {
    const { onIdle } = start();
    const poll = setInterval(() => {}, 30 * 1000);
    advance(IDLE_TIMEOUT_MS);
    clearInterval(poll);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('once the warning shows, only "Stay signed in" keeps the session', () => {
    const { onIdle, result } = start();
    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    expect(result.current.warningDeadline).not.toBeNull();

    fireEvent.pointerMove(window);
    advance(1000);
    expect(result.current.warningDeadline).not.toBeNull();

    act(() => result.current.stayActive());
    expect(result.current.warningDeadline).toBeNull();
    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS - 1000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('signs out as soon as a sleeping or hidden tab is back, even if its timer is late', () => {
    const { onIdle } = start();
    jest.setSystemTime(Date.now() + 45 * MIN); // the clock moved, no timer fired
    expect(onIdle).not.toHaveBeenCalled();
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('a tab restored long after its last use signs out on load', () => {
    markActivity(Date.now() - 2 * 60 * MIN);
    const { onIdle } = start();
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('a reload keeps the remaining idle time', () => {
    markActivity(Date.now() - 10 * MIN);
    const { onIdle } = start();
    advance(20 * MIN - 1);
    expect(onIdle).not.toHaveBeenCalled();
    advance(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does nothing while signed out, and clears the warning on sign-out', () => {
    const { onIdle, result, rerender } = start();
    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
    expect(result.current.warningDeadline).not.toBeNull();

    rerender({ enabled: false });
    expect(result.current.warningDeadline).toBeNull();
    advance(2 * IDLE_TIMEOUT_MS);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('sign-out forgets the tab’s activity, so the next login starts a fresh 30 minutes', () => {
    markActivity();
    clearAccessToken();
    expect(getLastActivity()).toBeNull();
  });
});

describe('IdleWarningDialog', () => {
  it('counts down and focuses "Stay signed in"', () => {
    render(<IdleWarningDialog deadline={Date.now() + IDLE_WARNING_MS} onStay={jest.fn()} onSignOut={jest.fn()} />);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2:00');
    expect(screen.getByText('Stay signed in')).toHaveFocus();
    advance(61 * 1000);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('0:59');
  });

  it('Stay, Escape and Sign out call their handlers', () => {
    const onStay = jest.fn();
    const onSignOut = jest.fn();
    render(<IdleWarningDialog deadline={Date.now() + IDLE_WARNING_MS} onStay={onStay} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByText('Stay signed in'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText('Sign out now'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
