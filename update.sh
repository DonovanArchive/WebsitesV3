#!/bin/bash
sites=($(ls --color=never src/sites))
containers=(${sites[@]} imgen)
ids=()
declare -A names=()
declare -A nextnum=()
scale1=""
scale2=""

for i in "${containers[@]}"
do
    id=$(docker ps -f name=$i --format "{{.ID}}")
    if [ -z "$id" ]
    then
      echo $i not found
      continue
    fi

    parts=($id)
    if [ ${#parts[@]} -gt 1 ]
    then
        echo $i has multiple containers
        nums=($(docker inspect $id --format '{{index .Config.Labels "com.docker.compose.container-number"}}'))
        a=$((nums[0]))
        b=$((nums[1]))
        if [ $a -lt $b ]
        then
          id=${parts[0]}
        else
          id=${parts[1]}
        fi
        echo $a $b
    fi
    ids+=($id)
    names[$id]=$(docker ps -f name=$i --format "{{.Names}}")
    scale1+=" --scale $i=1"
    scale2+=" --scale $i=2"
    num=$(docker inspect $id --format '{{index .Config.Labels "com.docker.compose.container-number"}}')
    nextnum[$i]=$(($num + 1))
done

echo Scaling Up
docker compose up -d --no-deps $scale2 --no-recreate "${containers[@]}"
sleep 2

RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
GREY='\033[0;37m'
status_code () {
    if [ -z "$1" ]; then
      printf "${GREY}?${RESET}"
      # 200 - 299
    elif [ "$1" -gt 199 ] && [ "$1" -lt 300 ]; then
      printf "${GREEN}$1${RESET}"
      # 300 - 399
    elif [ "$1" -gt 299 ] && [ "$1" -lt 400 ]; then
      printf "${CYAN}$1${RESET}"
      # 400 - 499
    elif [ "$1" -gt 399 ] && [ "$1" -lt 500 ]; then
      printf "${YELLOW}$1${RESET}"
      # 500 - 599
    elif [ "$1" -gt 499 ] && [ "$1" -lt 600 ]; then
      printf "${RED}$1${RESET}"
    else
      printf "${GREY}$1${RESET}"
    fi
}

sudo nginx -t
sudo nginx -s reload
echo Nginx Reloaded
info=""
warn=""
for i in "${sites[@]}"
do
    id=$(docker ps -f name=$i -f label=com.docker.compose.container-number=${nextnum[$i]} --format "{{.ID}}")
    hostname=$(docker inspect $id --format "{{.Config.Labels.hostname}}")
    ip=$(docker inspect $id --format "{{.NetworkSettings.Networks.websites.IPAddress}}")
    declare -A statuses=(
        ["host"]=$(status_code $(curl -s -o /dev/null -I -w "%{http_code}" -k -H "Host: $i" https://$hostname))
        ["ip"]=$(status_code $(curl -s -o /dev/null -I -w "%{http_code}" -k -H "Host: $i" https://$ip))
        ["local"]=$(status_code $(curl -s -o /dev/null -I -w "%{http_code}" -k -H "Host: $i" https://localhost))
        ["external"]=$(status_code $(curl -s -o /dev/null -I -w "%{http_code}" -k -H "Host: $i" https://$i))
    )
    info+=$'\n'"host status"$'\n'"$hostname ${statuses["host"]}"$'\n'"$ip ${statuses["ip"]}"$'\n'"local ${statuses["local"]}"$'\n'"external ${statuses["external"]}"$'\n'

    if [ ${statuses["host"]} != ${statuses["ip"]} ]; then
      warn+="${RED}Host and IP response do not match ($i) ${RESET}\n"
    fi

    if [ ${statuses["host"]} != ${statuses["local"]} ]; then
      warn+="${RED}Host and Local response do not match ($i) ${RESET}\n"
    fi

    if [ ${statuses["ip"]} != ${statuses["local"]} ]; then
      warn+="${RED}IP and Local response do not match ($i) ${RESET}\n"
    fi
done
echo "$info" | column -t -L
printf "$warn\n"
echo Reachability Test Done

for i in "${ids[@]}"
do
:
  echo Removing ${names[$i]}
  docker stop $i 1> /dev/null
  docker rm $i 1> /dev/null
done

echo Old Containers Removed

echo Scaling Down
docker compose up -d --no-deps $scale1 --no-recreate "${containers[@]}"
echo Update Complete
