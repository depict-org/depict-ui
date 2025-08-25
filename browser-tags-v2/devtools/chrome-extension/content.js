(() => {
  console.log("DEPICT EXTENSION ACTIVE, OVERRIDING...");
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "http://localhost:1234/depict-ai.js";
  console.log("injected", script);
  document.documentElement.prepend(script);
})();
