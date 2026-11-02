// Grid header of the exemption column, with the hint that it applies to abolished posts only
export default function ExemptionHeaderComponent(props) {
  const onHeaderClick = (e) => {
    if (props.enableSorting && typeof props.progressSort === 'function') {
      props.progressSort(e.shiftKey);
    }
  };

  return (
    <div
      onClick={onHeaderClick}
      className="flex flex-col items-center justify-center text-center w-full leading-tight py-1 select-none cursor-pointer"
      title="User have to select only if the post is abolished"
    >
      <span className="font-extrabold uppercase tracking-wide text-white text-[11px] sm:text-xs text-center">
        Reason for Exemption from Abolition
      </span>
      <span
        style={{ color: '#ff9999' }}
        className="text-[10px] sm:text-[11px] font-bold mt-0.5 normal-case tracking-normal drop-shadow-xs text-center"
      >
        (Select only if post is abolished)
      </span>
    </div>
  );
}
