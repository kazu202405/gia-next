import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { About } from "@/components/sections/about";
import { Works } from "@/components/sections/works";

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <About />
      <Works />
    </>
  );
}
