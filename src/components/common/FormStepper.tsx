import React from "react";

export type FormStep = {
  id: number;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type FormStepperProps = {
  steps: FormStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
};

const FormStepper: React.FC<FormStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-dark-200 overflow-x-auto ${className}`}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            type="button"
            onClick={() => onStepClick?.(step.id)}
            className="flex items-center gap-2 shrink-0 text-left"
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${currentStep === step.id
                  ? "bg-brand-500 text-white"
                  : currentStep > step.id
                    ? "bg-brand-500/20 text-brand-600 dark:text-brand-400"
                    : "bg-neutral-200 dark:bg-neutral-dark-200 text-neutral-400 dark:text-neutral-dark-500"
                }`}
            >
              {currentStep > step.id ? (
                <span className="text-xs">✓</span>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`hidden sm:block text-sm font-medium whitespace-nowrap ${currentStep === step.id
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-neutral-400 dark:text-neutral-dark-500"
                }`}
            >
              {step.title}
            </span>
          </button>

          {index < steps.length - 1 && (
            <div
              className={`flex-1 min-w-[32px] h-0.5 mx-2 ${currentStep > step.id
                  ? "bg-brand-500"
                  : "bg-neutral-200 dark:bg-neutral-dark-200"
                }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default FormStepper;
