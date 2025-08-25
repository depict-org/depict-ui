#!/bin/sh

for source in "$@"
do
    base=$(basename $source)
    if [ "$base" = "dpc" ]; then
        base="performance-client"
    fi
    dest="../../../../../../../browser-tags-v2/packages/$base" 
    echo "replacing $source with $dest symlink"
    rm -rf $source
    ln -s $dest $source
done
