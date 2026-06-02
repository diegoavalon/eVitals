import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "eVitals" },
    { name: "description", content: "Welcome to eVitals!" },
  ];
}

export default function Home() {
  return "hello";
}
