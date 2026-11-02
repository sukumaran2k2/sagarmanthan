import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// jsdom has no TextEncoder / TextDecoder, but React Router 7 uses them as soon as it is imported
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder;
