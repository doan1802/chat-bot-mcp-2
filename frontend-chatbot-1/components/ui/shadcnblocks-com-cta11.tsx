import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Cta11Props {
  heading: string;
  description: string;
  backgroundImage?: string;
  buttons?: {
    primary?: {
      text: string;
      url: string;
    };
    secondary?: {
      text: string;
      url: string;
    };
  };
}

const Cta11 = ({
  heading = "Ready to Get Started?",
  description = "Join thousands of satisfied customers using our platform to build amazing websites.",
  backgroundImage,
  buttons = {
    primary: {
      text: "Get Started",
      url: "https://www.shadcnblocks.com",
    },
    secondary: {
      text: "Learn More",
      url: "https://www.shadcnblocks.com",
    },
  },
}: Cta11Props) => {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-5xl px-6 flex items-center justify-center">
        <div
          className={cn(
            "flex flex-col items-center rounded-lg p-8 text-center md:rounded-xl lg:p-16 relative overflow-hidden w-full",
            !backgroundImage && "bg-accent"
          )}
          style={backgroundImage ? {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {/* Overlay for better text readability when using background image */}
          {backgroundImage && (
            <div className="absolute inset-0 bg-black/50 z-0"></div>
          )}

          <div className="relative z-10">
            <h3 className="mb-3 max-w-3xl text-2xl font-semibold md:mb-4 md:text-4xl lg:mb-6">
              {heading}
            </h3>
            <p className="mb-8 max-w-3xl text-muted-foreground lg:text-lg">
              {description}
            </p>
            <div className="flex w-full flex-col justify-center gap-2 sm:flex-row">
              {buttons.secondary && (
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href={buttons.secondary.url}>{buttons.secondary.text}</a>
                </Button>
              )}
              {buttons.primary && (
                <Button className="w-full sm:w-auto" asChild>
                  <a href={buttons.primary.url}>{buttons.primary.text}</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Cta11 };
