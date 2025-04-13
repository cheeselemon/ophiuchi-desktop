import React from "react";

/**
 * This hook will round the height of the element to the nearest integer.
 * @param ref The ref of the element to observe.
 */
function useIntegerHeight(ref: React.RefObject<HTMLElement>) {
  const [height, setHeight] = React.useState<number | null>(null);

  const adjustHeight = React.useCallback(() => {
    if (!ref.current) return;

    const element = ref.current;
    const currentHeight = element.getBoundingClientRect().height;
    const roundedHeight = Math.round(currentHeight);

    if (currentHeight !== roundedHeight) {
      element.style.height = `${roundedHeight}px`;
      setHeight(roundedHeight);
    }
  }, [ref]);

  // Initial measurement after mount and ref is available
  React.useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  // Set up ResizeObserver for subsequent changes
  React.useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [ref, adjustHeight]);

  return height;
}

export default useIntegerHeight;