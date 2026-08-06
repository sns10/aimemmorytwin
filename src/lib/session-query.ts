import { queryOptions } from "@tanstack/react-query";
import { getSessionInfo } from "./session.functions";

export const sessionQuery = queryOptions({
  queryKey: ["session-info"],
  queryFn: () => getSessionInfo(),
  staleTime: 0,
});