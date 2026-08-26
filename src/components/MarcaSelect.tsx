import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const MARCAS_AUTO = [
  "Abarth","Acura","Aiways","Alfa Romeo","Alpine","Aston Martin","Audi","Austin",
  "BAIC","Bentley","BMW","BYD","Cadillac","Changan","Chevrolet","Chrysler","Citroën",
  "Cupra","Dacia","Daewoo","Daihatsu","DFSK","Dodge","DS Automobiles","Ferrari","Fiat",
  "Fisker","Ford","Foton","GAC","Geely","Genesis","GMC","Great Wall","Honda","Hummer",
  "Hyundai","Infiniti","Isuzu","Iveco","Jaguar","Jeep","Kia","Koenigsegg","Lada",
  "Lamborghini","Lancia","Land Rover","Lexus","Ligier","Lincoln","Lotus","Lucid",
  "Mahindra","Maserati","Maxus","Maybach","Mazda","McLaren","Mercedes-Benz","MG",
  "Microcar","Mini","Mitsubishi","Morgan","NIO","Nissan","Opel","Pagani","Peugeot",
  "Polestar","Pontiac","Porsche","RAM","Renault","Rolls-Royce","Rover","Saab","Seat",
  "Seres","Skoda","Smart","SsangYong","Subaru","Suzuki","Tata","Tesla","Toyota",
  "Volkswagen","Volvo","Voyah","XPeng","Zhidou",
].sort((a, b) => a.localeCompare(b, "pt"));

const ALL_OPTIONS = [...MARCAS_AUTO, "Outra Marca"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function MarcaSelect({ value, onChange, placeholder = "Selecione a marca" }: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar marca..." />
          <CommandList>
            <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
            <CommandGroup>
              {ALL_OPTIONS.map((m) => (
                <CommandItem
                  key={m}
                  value={m}
                  onSelect={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === m ? "opacity-100" : "opacity-0")} />
                  {m}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
