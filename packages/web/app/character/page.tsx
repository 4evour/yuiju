import { NICKNAME, SUBJECT_NAME } from "@yuiju/utils/constants/character";
import {
  BookHeart,
  CakeSlice,
  Languages,
  Palette,
  Ruler,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const PROFILE_FACTS = [
  { label: "年龄", value: "16 岁", icon: UserRound },
  { label: "生日", value: "4 月 30 日", icon: CakeSlice },
  { label: "身高", value: "155 cm", icon: Ruler },
  { label: "语言", value: "中文、日语", icon: Languages },
] as const;

const LIKES = ["浅蓝色", "甜品", "柠檬水", "春天", "旅行", "小猫咪", "轻小说", "夏天的雨声"];

export default function CharacterPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-[18px] pt-[18px] pb-[36px] text-[#2b2f36]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-[#d9e6f5] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#7e8ccb]">
            <UserRound className="size-3.5" aria-hidden="true" />
            CHARACTER PROFILE
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">角色资料</h1>
          <p className="mt-2 text-sm text-[#74808e]">关于悠酱的固定人物设定</p>
        </div>
        <Badge
          variant="soft"
          size="sm"
          className="border-[#cbd8ef] bg-[#eef3ff] font-bold text-[#6675b5]"
        >
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          只读资料
        </Badge>
      </header>

      <Card className="grid min-h-[360px] md:grid-cols-[300px_1fr]">
        <div className="relative flex min-h-[320px] items-end justify-center overflow-hidden bg-[linear-gradient(145deg,#dff2ff_0%,#edf2ff_52%,#fff9ea_100%)] px-6 pt-8">
          <div
            className="absolute inset-0 opacity-35"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(#91c4ee 1px, transparent 1px), linear-gradient(90deg, #91c4ee 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute top-5 left-5 font-fusion-pixel text-[11px] tracking-[0.12em] text-[#6675b5]">
            CURRENT PORTRAIT
          </div>
          <div className="absolute top-5 right-5 h-3 w-3 border-2 border-[#7e8ccb] bg-[#fff9ea] shadow-[4px_4px_0_#91c4ee]" />
          <Image
            src="/images/yuiju-pixel-idle-04.png"
            alt="悠酱像素立绘"
            width={180}
            height={203}
            priority
            className="relative z-10 h-auto w-[210px] [image-rendering:pixelated]"
          />
        </div>

        <div className="grid content-center gap-7 p-6 sm:p-8">
          <div>
            <p className="font-fusion-pixel text-xs font-bold tracking-[0.1em] text-[#7e8ccb]">
              雨澤 悠乃 · あまさわ ゆうの
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-4xl font-black tracking-tight">{SUBJECT_NAME}</h2>
              <span className="text-base font-bold text-[#74808e]">昵称 {NICKNAME}</span>
            </div>
            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#596675]">
              一名性格内向、温柔，也有一点小别扭的高中女孩。她希望像真正的女孩一样生活，安静地感受世界，也保留自己的判断和边界。
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#d9e6f5] bg-[#d9e6f5] sm:grid-cols-4">
            {PROFILE_FACTS.map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.label} className="bg-[#fbfdff] p-4">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#8b96a4]">
                    <Icon className="size-3.5 text-[#7e8ccb]" aria-hidden="true" />
                    {fact.label}
                  </dt>
                  <dd className="mt-2 text-sm font-black text-[#30363e]">{fact.value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#7e8ccb]" aria-hidden="true" />
            <h2 className="text-base font-black">性格与能力</h2>
          </div>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-[#596675]">
            <p>整体安静、细腻而克制，遇到真正喜欢或感兴趣的事情时，也会自然流露出活泼和好奇。</p>
            <p>不喜欢运动，没有参加社团活动；擅长日式料理，也会拒绝特别过分或越界的要求。</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BookHeart className="size-4 text-[#7e8ccb]" aria-hidden="true" />
            <h2 className="text-base font-black">喜欢的事物</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LIKES.map((item) => (
              <Badge key={item} variant="chip" size="sm" className="bg-[#f7fbff]">
                {item}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-[#7e8ccb]" aria-hidden="true" />
            <h2 className="text-base font-black">外观</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#596675]">
            浅棕色双马尾，以蓝色丝带点缀；头戴纯白色贝雷帽，左侧别着带有 TypeScript Logo
            的“TS”发夹。经典水手服打底，外穿浅米色开衫，蓝色领结与百褶裙相互呼应。
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#7e8ccb]" aria-hidden="true" />
            <h2 className="text-base font-black">背景与创作</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="text-[#8b96a4]">开发者</dt>
              <dd className="font-semibold text-[#596675]">翊小久</dd>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="text-[#8b96a4]">画师</dt>
              <dd className="font-semibold text-[#596675]">墨小斓</dd>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="text-[#8b96a4]">家庭记忆</dt>
              <dd className="leading-6 text-[#596675]">目前没有关于父母和家庭生活的可用记忆。</dd>
            </div>
          </dl>
        </Card>
      </div>

      <footer className="mt-6 border-t border-[#d9e6f5] pt-4 text-xs text-[#97a1ad]">
        当前页面仅展示代码中已有的固定角色设定，不会修改角色状态或记忆。
      </footer>
    </main>
  );
}
