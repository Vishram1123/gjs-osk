import xml.etree.ElementTree as et

def read_names(path: str) -> list[str]:
    names = []
    tree = et.parse(path)
    root = tree.getroot()

    layout_list = root.find('layoutList')

    for layout in layout_list:
        names.append(layout.find('configItem').find('name').text)

    return names

def main():
    base_names = read_names('/usr/share/X11/xkb/rules/evdev.xml')
    extra_names = read_names('/usr/share/X11/xkb/rules/evdev.extras.xml')

    # evdev.extras.xml has <entries, that also appear in evdev.xml, e.g. de, cz, or ua, so we
    # need to deduplicate
    names = set(base_names)
    names.update(extra_names)

    for name in sorted(names):
        print(name)

if __name__ == '__main__':
    main()
