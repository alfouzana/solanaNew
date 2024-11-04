import React from "react";
import SolanaCreateToken from "../components/SolanaCreateToken";

const Home = () => {
  // Example function for setting loading state
  const setLoader = (loading) => console.log("Loading:", loading);

  return <SolanaCreateToken setLoader={setLoader} />;
};

export default Home;
