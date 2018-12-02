import sys
import json
import mysql.connector
num_threads = int(sys.argv[1]) # The number of longest threads (in terms of number of messages) to retrieve

data = json.load(open('../data/enronThread2001.json'))
data.sort(key=lambda x: -len(x['messages']))
data = data[:num_threads]

# There's a problem with email of recipients. There are some emails as nan. Replace them with text.
for t in data:
    for m in t['messages']:
        for r in m['recipients']:
            if type(r['email']) == float:
                r['email'] = ''

# Add message body from the database.
cnx = mysql.connector.connect(user='root', password='', host='127.0.0.1', database='enron')
cursor = cnx.cursor()

def find_message_body(sender, time):
    query = 'select body from message where sender="{}" and date="{}"'.format(sender, time)
    cursor.execute(query)
    result = cursor.fetchone()
    return result[0] if result else ''

for i, t in enumerate(data):
    for j, m in enumerate(t['messages']):
        cnx = mysql.connector.connect(user='root', password='', host='127.0.0.1', database='enron')
        cursor = cnx.cursor()
        m['body'] = find_message_body(m['sender'], m['time'])

# Export
with open('../data/threads-{}.json'.format(num_threads), 'w') as f:
    json.dump(data, f)