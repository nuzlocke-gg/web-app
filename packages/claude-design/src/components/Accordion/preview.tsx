import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@workspace/ui/components/accordion"

export default function Demo() {
  return (
    <Accordion defaultValue={["first"]}>
      <AccordionItem value="first">
        <AccordionTrigger>First encounter rule</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          You may catch only the first Pokémon you meet on each route.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="faint">
        <AccordionTrigger>Fainting rule</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          A Pokémon that faints is dead. Release it or move it to the graveyard.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="nickname">
        <AccordionTrigger>Nickname rule</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Give every Pokémon a nickname.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
