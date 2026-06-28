import { Check, Gamepad2, MessageCircle, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionBarProps = {
  isConnected?: boolean;
  roverLinked?: boolean;
  onConnect: () => void;
  onCycleTheme: () => void;
  onTalk: () => void;
};

export function ActionBar({
  isConnected = false,
  roverLinked = false,
  onConnect,
  onCycleTheme,
  onTalk,
}: ActionBarProps) {
  return (
    <section className="action-grid" aria-label="Rover actions">
      <Button variant="secondary" onClick={onTalk}>
        <MessageCircle data-icon="inline-start" />
        คุยกับ Lyra
      </Button>
      <Button onClick={onConnect}>
        {roverLinked ? <Check data-icon="inline-start" /> : <Gamepad2 data-icon="inline-start" />}
        {roverLinked ? "กำลังจับคู่" : isConnected ? "เชื่อมต่อ Rover" : "รอเข้าสู่ระบบ"}
      </Button>
      <Button variant="warm" onClick={onCycleTheme}>
        <Palette data-icon="inline-start" />
        เปลี่ยนสไตล์
      </Button>
    </section>
  );
}
