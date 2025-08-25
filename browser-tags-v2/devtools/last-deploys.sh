#!/bin/sh
# get the last 10 deploys done

grep "" deploys/*.txt \
  | sed 's/:/ /' \
  | awk '{ print $2 " " $3 " " $1 }' \
  | sort \
  | tail -n 10
