#!/usr/bin/env python3

import csv
import glob
import json
import os


def read_csv(filename):
    with open(filename) as f:
        return list(csv.DictReader(f, quoting=csv.QUOTE_NONNUMERIC))

def main():
    data = {}
    for datafile in glob.glob("data/*.csv"):
        # Set name to filename without directory and extension
        name = os.path.basename(os.path.splitext(datafile)[0])

        data[name] = read_csv(datafile)

    with open("docs/grieg.json", "w") as f:
        json.dump(data, f)


if __name__ == "__main__":
    main()
