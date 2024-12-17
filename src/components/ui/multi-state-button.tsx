export default function MultiStateButton({
  notReady,
  ready,
  done,
}: {
  notReady: {
    current: boolean;
    string: string;
  };
  ready: {
    current: boolean;
    string: string;
    onClick: () => void;
  };
  done: {
    current: boolean;
    string: string;
    onClick: () => void;
  };
}) {
  function bgColor() {
    if (done.current) return "bg-zinc-600 cursor-not-allowed";
    if (ready.current) return "bg-yellow-500 animate-bounce";
    if (notReady.current) return "bg-zinc-600 cursor-not-allowed";
  }

  function hoverBgColor() {
    if (done.current) return "hover:bg-zinc-600";
    if (ready.current) return "hover:bg-yellow-600";
    if (notReady.current) return "hover:bg-zinc-600";
  }

  function textColor() {
    if (done.current) return "text-green-400";
    if (ready.current) return "text-yellow-900 font-medium";
    if (notReady.current) return " ";
  }

  function displayString() {
    if (done.current) return done.string;
    if (ready.current) return ready.string;
    if (notReady.current) return notReady.string;
  }

  return (
    <button
      onClick={() => {
        if (notReady.current) return;
        if (ready.current) {
          ready.onClick();
        } else if (done.current) {
          done.onClick();
        }
      }}
      className={`block rounded-md ${bgColor()} px-6 py-2 text-center ${textColor()} ${hoverBgColor()} focus-visible:outline 
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 shrink-0`}
    >
      <div className="flex gap-2 items-center">{displayString()}</div>
    </button>
  );
}
