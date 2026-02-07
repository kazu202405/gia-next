import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { About } from "@/components/sections/about";
import { WorksStack } from "@/components/sections/works-stack";

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <About />
      <WorksStack />
    </>
  );
}
