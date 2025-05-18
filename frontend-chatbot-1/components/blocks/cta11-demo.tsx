import { Cta11 } from "@/components/ui/shadcnblocks-com-cta11"

const demoData = {
  heading: "Experience AI Chatbot with Real-time Voice",
  description:
    "Join thousands of satisfied users leveraging our platform for advanced AI communication.",
  backgroundImage: "/bgchat1.png",
  buttons: {
    primary: {
      text: "Get Started",
      url: "/signup",
    },
    secondary: {
      text: "Learn More",
      url: "#features",
    },
  },
};

function Cta11Demo() {
  return <Cta11 {...demoData} />;
}

export { Cta11Demo };
