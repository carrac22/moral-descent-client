import HostApp from "./HostApp";
import PlayerApp from "./PlayerApp";

export default function App() {
  const path = window.location.pathname;
  // /host → host big screen view
  // /join or anything else → player phone view
  if (path === "/host") return <HostApp />;
  return <PlayerApp />;
}
