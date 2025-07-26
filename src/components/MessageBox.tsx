import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function MessageCard({ agent, message }: { agent: string; message: string }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000 + Math.random() * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="my-2">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="bg-card rounded-xl shadow-md p-4">
          <AccordionTrigger className="text-neonGreen font-medium">{agent}</AccordionTrigger>
          <AccordionContent className="text-secondaryText">
            {loading ? "Thinking..." : message}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}