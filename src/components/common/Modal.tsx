import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ComponentType<{ className?: string }>;
    /** Width class, defaults to max-w-xl. For panels this sets the panel width. */
    maxWidth?: string;
    centerModal?: boolean;
    backdropClassName?: string;
    containerClassName?: string;
    children: React.ReactNode;
};

const Modal = ({
    open,
    onClose,
    title,
    subtitle,
    icon: Icon,
    maxWidth = "max-w-lg",
    centerModal = false,
    backdropClassName = "z-[59]",
    containerClassName = "z-[60]",
    children,
}: ModalProps) => {
    // Close on Escape key
    const onKeyDown = useRef((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    });
    useEffect(() => {
        const handler = onKeyDown.current;
        if (open) document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <>
            {/* ── Backdrop ── */}
            <div
                className={`fixed inset-0 ${backdropClassName} bg-black/20 dark:bg-black/40 backdrop-blur-[4px] transition-opacity duration-300 opacity-100`}
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`
                    fixed ${containerClassName}
                    ${centerModal
                        ? "inset-0 flex items-center justify-center p-4 transition-opacity duration-200 opacity-100"
                        : `top-0 right-0 bottom-0 w-full ${maxWidth} transition-transform duration-300 ease-in-out translate-x-0`
                    }
                `}
            >
                <div
                    className={centerModal
                        ? `w-full ${maxWidth} rounded-sm border border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-dark-700 overflow-hidden`
                        : "h-full min-h-screen flex flex-col border-l border-neutral-200 dark:border-neutral-dark-200 bg-white dark:bg-neutral-900"
                    }
                    onClick={centerModal ? (e) => e.stopPropagation() : undefined}
                >
                        <div className={`shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-dark-300 ${centerModal ? "bg-neutral-50/90 dark:bg-neutral-dark-100/90" : "bg-neutral-50/80 dark:bg-neutral-dark-100/80 backdrop-blur-sm"}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                {Icon && (
                                    <div className="shrink-0 p-2 rounded-xl bg-brand-500/10 dark:bg-brand-400/15">
                                        <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                        {title}
                                    </h2>
                                    {subtitle && (
                                        <p className={`text-neutral-500 dark:text-neutral-400 mt-0.5 truncate ${centerModal ? "text-sm" : "text-xs line-clamp-1 truncate break-words"}`}>
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`shrink-0 ml-3 p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors ${centerModal ? "rounded-xs hover:bg-neutral-200 dark:hover:bg-neutral-dark-200" : "rounded-xs hover:bg-neutral-300 dark:hover:bg-neutral-dark-300"}`}
                                aria-label={centerModal ? "Close modal" : "Close panel"}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className={`custom-scrollbar h-full ${centerModal ? "px-6 py-6 max-h-[85vh] overflow-y-auto bg-white dark:bg-neutral-dark-200" : "flex-1 overflow-y-auto px-3 bg-white dark:bg-neutral-dark-200"}`}>
                            {children}
                        </div>
                    </div>
                </div>
        </>,
        document.body,
    );
};

export default Modal;
