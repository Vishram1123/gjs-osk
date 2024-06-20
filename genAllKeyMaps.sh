echo "{" > gjsosk@vishram1123.com/keycodes.json
for i in $(localectl list-x11-keymap-layouts); do
	echo $i
	python genKeyMap.py "$i" >> gjsosk@vishram1123.com/keycodes.json
	for j in $(localectl list-x11-keymap-variants $i 2> /dev/null); do
		echo "$i+$j"
		python genKeyMap.py "$i+$j" >> gjsosk@vishram1123.com/keycodes.json
	done; 
done;
tac "gjsosk@vishram1123.com/keycodes.json" | awk -v c="," '!p && sub(c, "") {p=1} 1' | tac > temp.txt && mv temp.txt "gjsosk@vishram1123.com/keycodes.json"
echo "}" >> gjsosk@vishram1123.com/keycodes.json
