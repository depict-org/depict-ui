#!/bin/bash

# If no argument, default to all project with *
PACKAGE=${1:-"*"}
PACKAGE_PATH="packages/$PACKAGE/src"

brew_install() {
    if brew list $1 &>/dev/null; then
        echo "${1} is already installed"
    else
        echo "\nInstalling $1"
        brew install $1 && echo "$1 is installed"
    fi
}

brew_install "fswatch"

echo Watching files at $PACKAGE_PATH;

if [[ $PACKAGE == "*" ]]
then
  fswatch -0 $PACKAGE_PATH | xargs -0 -n 1 -I {} bash -c 'yarn build_packages'
else
  fswatch -e $PACKAGE_PATH/version.ts -0 $PACKAGE_PATH | xargs -0 -n 1 -I {} bash -c "cd ${PACKAGE_PATH} && yarn build"
fi
