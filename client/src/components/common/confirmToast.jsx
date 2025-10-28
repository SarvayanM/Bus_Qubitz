import toast from "react-hot-toast";

/**
 * showConfirmToast(message, {confirmText, cancelText}) -> Promise<boolean>
 * Usage:
 *   const ok = await showConfirmToast("Confirm booking for 2 seats?");
 *   if (!ok) return;
 *   // proceed to create passenger & booking
 */
export function showConfirmToast(
  message,
  {
    confirmText = "Confirm",
    cancelText = "Cancel",
    icon = null,
    // You can pass a unique id if you need at-most-one open toast of this type
    id = undefined,
  } = {}
) {
  return new Promise((resolve) => {
    const tId = toast.custom(
      (t) => (
        <div
          className={`w-[min(92vw,420px)] rounded-xl border shadow-lg p-4 bg-white
                      ring-1 ring-slate-200 transition-all duration-200
                      ${
                        t.visible
                          ? "animate-[fadeIn_.15s_ease-out]"
                          : "animate-[fadeOut_.12s_ease-in]"
                      }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {icon ?? (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 grid place-items-center font-bold">
                  !
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-800 font-semibold">{message}</p>
              <p className="text-xs text-slate-600 mt-1">
                Please confirm to continue.
              </p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    resolve(false);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    resolve(true);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition shadow-sm"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      { id, duration: Infinity }
    );
  });
}
