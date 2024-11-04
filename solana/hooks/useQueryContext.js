import { useRouter } from "next/router";

export default function useQueryContext() {
  const router = useRouter();
  const { cluster } = router.query;

  const endpoint = cluster ? cluster : "mainnet";
  const hasClusterOption = endpoint !== "mainnet";
  const fmtUrlWithCluster = (url) => {
    if (hasClusterOption) {
      const mark = url.includes("?") ? "&" : "?";
      return decodeURIComponent(`${url}${mark}cluster=${endpoint}`);
    }
    return url;
  };

  return {
    fmtUrlWithCluster,
  };
}
