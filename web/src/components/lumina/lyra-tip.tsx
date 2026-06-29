import Image from "next/image";
import { Lightbulb } from "lucide-react";
import { luminaAssets } from "./assets";

type LyraTipProps = {
  message: string;
};

export function LyraTip({ message }: LyraTipProps) {
  return (
    <section className="lyra-tip" aria-label="Lyra helper tip">
      <Image
        alt="Lyra connection guide"
        className="lyra-tip-asset"
        height={luminaAssets.lyraConnect.height}
        src={luminaAssets.lyraConnect.src}
        width={luminaAssets.lyraConnect.width}
      />
      <div className="lyra-tip-bubble">
        <p>{message}</p>
      </div>
      <span className="lyra-tip-icon" aria-hidden="true">
        <Lightbulb data-icon="inline-start" />
      </span>
    </section>
  );
}
