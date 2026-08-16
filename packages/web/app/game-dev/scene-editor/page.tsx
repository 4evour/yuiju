import { SceneEditor } from "./scene-editor";

export default function GameSceneEditorPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f2ead7_0%,#e7d9bd_100%)] px-[18px] py-[28px] text-[#493247]">
      <div className="mx-auto grid max-w-[1500px] gap-[20px]">
        <header className="font-fusion-pixel text-center">
          <p className="text-[14px] tracking-[0.22em] text-[#7b665d]">游戏开发工具</p>
          <h1 className="mt-[6px] text-[28px]">场景区域编辑器</h1>
        </header>
        <SceneEditor />
      </div>
    </main>
  );
}
