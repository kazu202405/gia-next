import { Composition } from "remotion";
import {
  GiaStoriesIntro,
  GIA_STORIES_VIDEO_CONFIG,
} from "../components/remotion/gia-stories-video";

export const RemotionRoot = () => {
  const { id, fps, durationInFrames, width, height } = GIA_STORIES_VIDEO_CONFIG;

  return (
    <Composition
      id={id}
      component={GiaStoriesIntro}
      durationInFrames={durationInFrames}
      fps={fps}
      width={width}
      height={height}
    />
  );
};
