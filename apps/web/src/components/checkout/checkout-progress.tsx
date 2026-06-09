export type CheckoutProgressStep = 'details' | 'payment';

interface CheckoutProgressProps {
  activeStep: CheckoutProgressStep;
  className?: string;
}

const STEPS = [
  {
    id: 'details',
    label: 'Delivery details',
    description: 'Address, timing, tip, promo, and order review',
  },
  {
    id: 'payment',
    label: 'Secure payment',
    description: 'Server-confirmed total and Stripe payment',
  },
] as const;

export function CheckoutProgress({ activeStep, className = '' }: CheckoutProgressProps) {
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);

  return (
    <nav aria-label="Checkout progress" className={className}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = index < activeIndex;

          return (
            <li
              key={step.id}
              aria-current={isActive ? 'step' : undefined}
              className={`rounded-lg border p-3 ${
                isActive
                  ? 'border-primary bg-primarySoft'
                  : isComplete
                    ? 'border-success/30 bg-successSoft'
                    : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isActive
                      ? 'bg-primary text-primaryFg'
                      : isComplete
                        ? 'bg-success text-white'
                        : 'bg-surfaceMuted text-textMuted'
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-text">{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-textMuted">{step.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
