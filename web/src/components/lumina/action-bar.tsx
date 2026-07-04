import Link from "next/link";
import { Check, Coffee, Gamepad2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionBarProps = {
  connectHref?: string;
  isConnected?: boolean;
  roverLinked?: boolean;
  onConnect: () => void;
  onCoffee: () => void;
  onTalk: () => void;
};

export function ActionBar({
  connectHref,
  isConnected = false,
  roverLinked = false,
  onConnect,
  onCoffee,
  onTalk,
}: ActionBarProps) {
  const connectLabel = roverLinked ? "กำลังจับคู่" : isConnected ? "เชื่อมต่อ Rover" : "เชื่อมต่อ Rover";
  const connectIcon = roverLinked ? <Check data-icon="inline-start" /> : <Gamepad2 data-icon="inline-start" />;

  return (
    <section className="action-grid" aria-label="Rover actions">
      <Button variant="secondary" onClick={onTalk}>
        <MessageCircle data-icon="inline-start" />
        คุยกับ Lyra
      </Button>
      {connectHref ? (
        <Button asChild>
          <Link href={connectHref} onClick={onConnect}>
            {connectIcon}
            {connectLabel}
          </Link>
        </Button>
      ) : (
        <Button onClick={onConnect}>
          {connectIcon}
          {connectLabel}
        </Button>
      )}
      <Button variant="warm" onClick={onCoffee}>
        <Coffee data-icon="inline-start" />
        เลี้ยงกาแฟผู้พัฒนา
      </Button>
    </section>
  );
}
