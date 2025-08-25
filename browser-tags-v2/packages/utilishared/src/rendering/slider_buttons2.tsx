/**
 * Returns an object to put into `button_contents` for `Pro_Slider` containing the icon arrow images
 * @return An object with left and right being an array containing one image
 */

export function make_button2() {
  const img = (
    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0eWxlPSJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7IiB3aWR0aD0iMTZweCIgaGVpZ2h0PSIxNnB4IiB2aWV3Qm94PSIwIDAgOCAxNSI+PHBhdGggc3R5bGU9ImZpbGw6IHJnYigwLCAwLCAwKTsiIGQ9Ik0uNjI5LjAwMWMuMTUuMDA4LjI5My4wNzIuMzk4LjE4bDYuNzkyIDYuODlhLjYwMS42MDEgMCAwIDEgMCAuODZsLTYuNzkyIDYuODg4YS41ODYuNTg2IDAgMCAxLS44NDYgMCAuNjAxLjYwMSAwIDAgMSAwLS44Nkw2LjU1NCA3LjUuMjExIDEuMDAxYS42MDEuNjAxIDAgMCAxIDAtLjg2Yy4xMTUtLjEuMjY2LS4xNS40MTgtLjE0Ij48L3BhdGg+PC9zdmc+" />
  ) as HTMLImageElement;
  return {
    left: [img],
    right: [img.cloneNode() as HTMLImageElement],
  };
}
