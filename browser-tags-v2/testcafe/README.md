There used to be frontend integration tests here. Now only the package tests matter. The Grid and Slider test functions might be useful in the package tests though.

### Show available local browsers

`yarn testcafe -b`

### Debugging tests

Use this directory (`testcafe/`) as cwd in order for testcafe to read `.testcaferc.json`.

`yarn testcafe --debug-on-fail "{browser_name}" {test_file_name}`

Where `{browser_name}` is an available local browser. Eg:

`yarn testcafe --debug-on-fail "firefox" tests/plantagen.ts`
