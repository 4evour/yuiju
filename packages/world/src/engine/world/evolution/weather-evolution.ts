import type { WeatherSnapshot, WorldStateData } from "@yuiju/utils";
import dayjs from "dayjs";
import { WEATHER_PERIOD_HOURS } from "@/engine/weather/constants";
import { generateWeatherSnapshot } from "@/engine/weather/generator";
import { resolveWeatherPeriod, type WeatherPeriod } from "@/engine/weather/time";
import { type WorldAdvanceContext, WorldEvolution } from "./world-evolution";

export class WeatherEvolution extends WorldEvolution {
  precondition(context: WorldAdvanceContext): boolean {
    const currentPeriod = resolveWeatherPeriod(context.toTime);
    const weather = context.worldStateData.weather;

    return (
      !weather ||
      weather.periodStartAt !== currentPeriod.startAt.toISOString() ||
      weather.periodEndAt !== currentPeriod.endAt.toISOString()
    );
  }

  async advance(context: WorldAdvanceContext): Promise<WorldStateData> {
    const currentPeriod = resolveWeatherPeriod(context.toTime);
    const previousWeather = this.resolvePreviousWeather(
      context.worldStateData.weather,
      context.toTime,
    );
    const periodsToGenerate = this.collectPeriodsToGenerate(previousWeather, currentPeriod);
    let latestWeather = previousWeather;
    let finalWeather: WeatherSnapshot | null = null;

    for (const period of periodsToGenerate) {
      const nextWeather = generateWeatherSnapshot({
        period,
        previousWeather: latestWeather,
        updatedAt: period.startAt.isSame(currentPeriod.startAt)
          ? context.toTime.toISOString()
          : period.startAt.toISOString(),
      });

      latestWeather = nextWeather;
      finalWeather = nextWeather;
    }

    return {
      ...context.worldStateData,
      weather: finalWeather,
    };
  }

  private resolvePreviousWeather(
    snapshot: WeatherSnapshot | null,
    toTime: Date,
  ): WeatherSnapshot | null {
    if (snapshot && !dayjs(snapshot.periodStartAt).isAfter(toTime)) {
      return snapshot;
    }

    return null;
  }

  private collectPeriodsToGenerate(
    previousWeather: WeatherSnapshot | null,
    currentPeriod: WeatherPeriod,
  ): WeatherPeriod[] {
    if (!previousWeather) {
      return [currentPeriod];
    }

    const periods: WeatherPeriod[] = [];
    let cursor = dayjs(previousWeather.periodEndAt);

    while (cursor.isBefore(currentPeriod.endAt)) {
      periods.push(resolveWeatherPeriod(cursor));
      cursor = cursor.add(WEATHER_PERIOD_HOURS, "hour");
    }

    if (periods.length === 0) {
      periods.push(currentPeriod);
    }

    return periods;
  }
}
