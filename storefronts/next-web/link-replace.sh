#!/bin/bash

for source in "$@"
do
    echo "$source"
    dest="${source/node_modules\/@depict-ai/../../browser-tags-v2/packages}"    
    echo "replacing $source with $dest hardlink"
    rm $source
    ln $dest $source
done
