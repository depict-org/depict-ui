export function make_button1() {
  const new_arrowimage = () => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KICAgIDxsaW5lIHgxPSI0IiB5MT0iMTIiIHgyPSIyMCIgeTI9IjEyIi8+CiAgICA8cG9seWxpbmUgcG9pbnRzPSIxNCA2IDIwIDEyIDE0IDE4Ii8+Cjwvc3ZnPg==`;
    return img;
  };
  return Object.fromEntries(["left", "right"].map(side => [side, [new_arrowimage()]])) as {
    left: [HTMLImageElement];
    right: [HTMLImageElement];
  };
}
