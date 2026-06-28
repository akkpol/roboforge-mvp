import { Gamepad2, MessageCircle, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionBarProps = {
  onConnect: () => void;
  onCycleTheme: () => void;
  onTalk: () => void;
};

export function ActionBar({ onConnect, onCycleTheme, onTalk }: ActionBarProps) {
  return (
    <section className="action-grid" aria-label="Rover actions">
      <Button variant="secondary" onClick={onTalk}>
        <MessageCircle data-icon="inline-start" />
        คุยกับ Lyra
      </Button>
      <Button onClick={onConnect}>
        <Gamepad2 data-icon="inline-start" />
        เชื่อมต่อ Rover
      </Button>
      <Button variant="warm" onClick={onCycleTheme}>
        <Palette data-icon="inline-start" />
        เปลี่ยนสไตล์
      </Button>
    </section>
  );
}
