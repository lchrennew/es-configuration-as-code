set -v
mkdir /es-configuration-as-code
cd /es-configuration-as-code || exit
mv /package.json .
echo "" > .env
yarn
rm -rf /build.sh
