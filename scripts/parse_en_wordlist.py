#!/usr/bin/env python3

# A simple script to turn a csv file that has word sounds + word and
# creates a directory + word of week file to be used for generation.

# Refer to en_word_list.csv

import csv
import os

word_data = {}

with open('en_word_list.csv', mode='r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        group = row['Group']
        word = row['Word']
        if group not in word_data:
            word_data[group] = []
        word_data[group].append(word)

for k in word_data.keys():
    clean = k.replace(' ','_')

    new_dir = os.path.join('..','public', clean)
    if not os.path.isdir(new_dir):
        os.mkdir(new_dir)
    wow = os.path.join(new_dir,'words_of_week.txt')
            
    print(f'Writing words of the week for {k} in {wow}')
    with open(wow, 'w+') as fh:
        for word in word_data[k]:
            fh.write(word +'\n')
    
