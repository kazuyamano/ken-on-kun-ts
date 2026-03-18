import { Header } from "@/components/header";
import { EntryForm } from "@/components/entry-form";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <div id="top-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="top-img" src="/ken-on-top.png" alt="毎日検温くんZ" />
      </div>
      <EntryForm />
      <Footer />
    </>
  );
}
