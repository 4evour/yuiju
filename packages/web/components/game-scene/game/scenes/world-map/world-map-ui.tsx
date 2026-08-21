import type Phaser from "phaser";
import { useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetchHomeSummary, HOME_SUMMARY_ENDPOINT } from "@/lib/api/home";
import {
  WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT,
  WORLD_MAP_MESSAGE_EVENT,
  WORLD_MAP_UNAVAILABLE_MESSAGE,
} from "./world-map-constant";

interface WorldMapUiProps {
  game: Phaser.Game;
}

export function WorldMapUi({ game }: WorldMapUiProps) {
  const { data: homeData } = useSWR(HOME_SUMMARY_ENDPOINT, fetchHomeSummary, {
    refreshInterval: 30 * 1000,
  });

  useEffect(() => {
    if (!homeData?.status?.location) {
      return;
    }

    game.events.emit(WORLD_MAP_CHARACTER_LOCATION_CHANGE_EVENT, homeData.status.location);
  }, [homeData, game]);

  useEffect(() => {
    const showUnavailableMessage = () => {
      toast.warning(WORLD_MAP_UNAVAILABLE_MESSAGE);
    };

    game.events.on(WORLD_MAP_MESSAGE_EVENT, showUnavailableMessage);
    return () => {
      game.events.off(WORLD_MAP_MESSAGE_EVENT, showUnavailableMessage);
    };
  }, [game]);

  return null;
}
