"use client";

import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityObservationCard as ActivityObservationCardData } from "./activity-data";

interface ActivityObservationCardProps {
  data: ActivityObservationCardData;
  summaryEditable: boolean;
}

const characterOptions = [
  { src: "/images/yuiju-pixel-idle.png", label: "待机动作 02" },
  { src: "/images/yuiju-pixel-idle-03.png", label: "待机动作 03" },
  { src: "/images/yuiju-pixel-idle-04.png", label: "待机动作 04" },
  { src: "/images/yuiju-pixel-idle-05.png", label: "待机动作 05" },
  { src: "/images/yuiju-pixel-review-03.png", label: "回顾动作 03" },
];

export function ActivityObservationCard({ data, summaryEditable }: ActivityObservationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();
  const [summary, setSummary] = useState(data.summary);
  const [characterImageSrc, setCharacterImageSrc] = useState(characterOptions[0].src);
  const isNight = data.period === "night";
  const summaryTextClass =
    summary.length > 150
      ? "text-[11px] leading-[1.55]"
      : summary.length > 100
        ? "text-[12px] leading-[1.6]"
        : "text-[13px] leading-[1.65]";
  const reasonTextClass =
    data.reason.length > 70 ? "text-[10px] leading-[1.45]" : "text-[11px] leading-[1.5]";

  const downloadImage = async () => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(undefined);

    try {
      await document.fonts.ready;
      const image = await toPng(card, {
        cacheBust: true,
        pixelRatio: 3,
        width: 360,
        height: 480,
      });
      const link = document.createElement("a");
      link.download = data.downloadFileName;
      link.href = image;
      link.click();
    } catch {
      setDownloadError("图片生成失败，请稍后重试。");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <div className="grid gap-3 p-[14px]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[14px] font-black">观察卡片</h3>
          <span className="text-[12px] text-[#6b7480]">3:4 PNG</span>
        </div>

        <div className="overflow-x-auto rounded-xl bg-[#eaf1f8] p-1">
          <div
            ref={cardRef}
            className={`font-fusion-pixel relative h-[480px] w-[360px] overflow-hidden ${isNight ? "bg-[#25345f]" : "bg-[#bfe8f7]"}`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-[212px] ${
                isNight
                  ? "bg-[linear-gradient(180deg,#25345f_0%,#5368a6_100%)]"
                  : "bg-[linear-gradient(180deg,#bfe8f7_0%,#e5f7ff_100%)]"
              }`}
            />

            {isNight ? <PixelStars /> : <PixelClouds />}

            <div
              className={`absolute left-4 top-4 z-10 border-2 px-2 py-1 text-[10px] font-bold tracking-[0.02em] ${
                isNight
                  ? "border-[#9eb5ed] bg-[#25345f]/88 text-[#f7f1c9]"
                  : "border-[#5a86a6] bg-[#fff6dc]/92 text-[#34405b]"
              }`}
            >
              {data.happenedAt} · {data.location}
            </div>

            <img
              src={characterImageSrc}
              alt=""
              className="absolute right-5 top-[48px] z-10 h-[156px] w-[144px] object-contain [image-rendering:pixelated]"
            />

            <div className="absolute inset-x-[10px] bottom-[10px] z-20 h-[286px] border-4 border-[#34405b] bg-[#fff6dc] px-4 py-3 shadow-[6px_6px_0_#17213c]">
              <div className="flex h-full flex-col">
                <h4 className="m-0 text-[19px] leading-tight font-black tracking-[0.02em] text-[#34405b]">
                  {data.action}
                </h4>

                <div className="mt-2 h-1 w-16 bg-[#63afde]" />

                <p className={`mt-2.5 mb-0 whitespace-pre-wrap text-[#343743] ${summaryTextClass}`}>
                  {summary}
                </p>

                <div className="mt-auto border-t-2 border-dashed border-[#d3b977] pt-2">
                  <div className="mb-1 text-[10px] font-black tracking-[0.08em] text-[#92743f]">
                    她为什么这样做
                  </div>
                  <p className={`m-0 whitespace-pre-wrap text-[#4b4650] ${reasonTextClass}`}>
                    “{data.reason}”
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-end text-[10px] font-bold text-[#536078]">
                  {data.durationMinutes} min
                </div>
              </div>
            </div>
          </div>
        </div>

        {summaryEditable ? (
          <div className="grid gap-1.5">
            <label
              className="text-[12px] font-semibold text-[#4f5b6b]"
              htmlFor="observation-card-summary"
            >
              卡片正文
            </label>
            <Textarea
              id="observation-card-summary"
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
        ) : null}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 px-0 text-[12px] font-semibold text-[#4f5b6b]">像素小人</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {characterOptions.map((option) => {
              const selected = characterImageSrc === option.src;

              return (
                <button
                  key={option.src}
                  type="button"
                  aria-label={`选择${option.label}`}
                  aria-pressed={selected}
                  title={option.label}
                  className={`flex h-16 cursor-pointer items-center justify-center rounded-lg border-2 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7ee6] ${
                    selected
                      ? "border-[#2f7ee6] bg-[#eaf3ff]"
                      : "border-[#d6e1ec] bg-[#f7fbff] hover:border-[#8aa9c7]"
                  }`}
                  onClick={() => setCharacterImageSrc(option.src)}
                >
                  <img
                    src={option.src}
                    alt=""
                    className="h-[52px] w-12 object-contain [image-rendering:pixelated]"
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button
          type="button"
          size="sm"
          className="w-full cursor-pointer"
          disabled={isDownloading}
          onClick={downloadImage}
        >
          <Download />
          {isDownloading ? "正在生成..." : "下载图片"}
        </Button>

        {downloadError ? (
          <p className="m-0 text-center text-[12px] text-[#b42318]">{downloadError}</p>
        ) : null}
      </div>
    </Card>
  );
}

function PixelStars() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className="absolute left-[28px] top-[54px] h-2 w-2 bg-[#f7f1c9] shadow-[8px_0_0_#f7f1c9,-8px_0_0_#f7f1c9,0_8px_0_#f7f1c9,0_-8px_0_#f7f1c9]" />
      <span className="absolute left-[88px] top-[112px] h-1.5 w-1.5 bg-[#dce8ff]" />
      <span className="absolute right-[42px] top-[86px] h-2 w-2 bg-[#f0c76b] shadow-[8px_0_0_#f0c76b,-8px_0_0_#f0c76b,0_8px_0_#f0c76b,0_-8px_0_#f0c76b]" />
      <span className="absolute right-[174px] top-[142px] h-1.5 w-1.5 bg-[#dce8ff]" />
    </div>
  );
}

function PixelClouds() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className="absolute left-[20px] top-[76px] h-4 w-16 bg-white/80 shadow-[16px_-16px_0_rgba(255,255,255,0.8),32px_0_0_rgba(255,255,255,0.8)]" />
      <span className="absolute right-[28px] top-[120px] h-3 w-12 bg-white/70 shadow-[-12px_-12px_0_rgba(255,255,255,0.7),12px_0_0_rgba(255,255,255,0.7)]" />
    </div>
  );
}
