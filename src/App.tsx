import { useEffect, useState } from "react";
import type { Settings } from "./components/Shared";
import { discLevels } from "./data/discLevels";
import { waveLevels } from "./data/waveLevels";
import { usePersisted } from "./hooks/usePersisted";
import { stopSpeaking } from "./lib/speech";
import { stopTone } from "./lib/tone";
import { DiscHome, DiscPlay } from "./pages/DiscLevelsPage";
import { DrawPage } from "./pages/DrawPage";
import { HomePage } from "./pages/HomePage";
import { LabPage } from "./pages/LabPage";
import { RadioPage } from "./pages/RadioPage";
import { RecipePage } from "./pages/RecipePage";
import { SkyPage } from "./pages/SkyPage";
import { WaveHome, WavePlay } from "./pages/WaveLevelsPage";
import { WindPage } from "./pages/WindPage";

type Route =
  | { page: "home" | "sky" | "lab" | "draw" | "wind" | "waves" | "discs" | "radio" | "recipe" }
  | { page: "wave"; id: number }
  | { page: "disc"; id: number };

const simple = ["sky", "lab", "draw", "wind", "waves", "discs", "radio", "recipe"] as const;

function parseRoute(hash: string): Route {
  const [, page, param] = hash.replace(/^#/, "").split("/");
  const id = Number(param);
  if (page === "waves" && waveLevels.some((l) => l.id === id)) return { page: "wave", id };
  if (page === "discs" && discLevels.some((l) => l.id === id)) return { page: "disc", id };
  const found = simple.find((name) => name === page);
  return { page: found ?? "home" };
}

/** 每一关最好拿了几颗星。 */
export type Stars = Partial<Record<number, number>>;
/** 两个小游戏最好的一次拿了几颗星。 */
export type Best = Partial<Record<"radio" | "recipe", number>>;

const keep = (prev: Stars, id: number, count: number) => ({ ...prev, [id]: Math.max(prev[id] ?? 0, count) });

function App() {
  const [sound, setSound] = usePersisted("fpg:sound", true);
  const [waveStars, setWaveStars] = usePersisted<Stars>("fpg:waves", {});
  const [discStars, setDiscStars] = usePersisted<Stars>("fpg:discs", {});
  const [best, setBest] = usePersisted<Best>("fpg:best", {});
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [round, setRound] = useState(0);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    stopSpeaking();
    stopTone();
    window.scrollTo(0, 0);
  }, [route]);

  const settings: Settings = { sound, setSound: (on) => { if (!on) stopSpeaking(); setSound(on); } };
  const go = (hash: string) => { window.location.hash = hash; };
  const goHome = () => go("#/");

  switch (route.page) {
    case "sky": return <SkyPage settings={settings} onBack={goHome} onGo={go} />;
    case "lab": return <LabPage settings={settings} onBack={goHome} />;
    case "draw": return <DrawPage settings={settings} onBack={goHome} />;
    case "wind": return <WindPage settings={settings} onBack={goHome} />;
    case "waves": return <WaveHome settings={settings} stars={waveStars} onBack={goHome} onPlay={(id) => go(`#/waves/${id}`)} />;
    case "wave":
      return <WavePlay key={`${route.id}-${round}`} level={waveLevels.find((l) => l.id === route.id)!} settings={settings}
        onBack={() => go("#/waves")} onAgain={() => setRound(round + 1)} onNext={(id) => go(`#/waves/${id}`)}
        onFinish={(id, count) => setWaveStars((prev) => keep(prev, id, count))} />;
    case "discs": return <DiscHome settings={settings} stars={discStars} onBack={goHome} onPlay={(id) => go(`#/discs/${id}`)} />;
    case "disc":
      return <DiscPlay key={`${route.id}-${round}`} level={discLevels.find((l) => l.id === route.id)!} settings={settings}
        onBack={() => go("#/discs")} onAgain={() => setRound(round + 1)} onNext={(id) => go(`#/discs/${id}`)}
        onFinish={(id, count) => setDiscStars((prev) => keep(prev, id, count))} />;
    case "radio": return <RadioPage settings={settings} onBack={goHome} onFinish={(count) => setBest((prev) => ({ ...prev, radio: Math.max(prev.radio ?? 0, count) }))} />;
    case "recipe": return <RecipePage settings={settings} onBack={goHome} onFinish={(count) => setBest((prev) => ({ ...prev, recipe: Math.max(prev.recipe ?? 0, count) }))} />;
    default: return <HomePage waveStars={waveStars} discStars={discStars} best={best} onGo={go} />;
  }
}

export default App;
