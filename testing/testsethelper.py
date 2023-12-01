from aiohttp import web
import json
import datetime
import os
import glob
from pathlib import Path

def merge_json_files(directory_pattern):
    all_data = []

    # Find all JSON files in the specified directory
    for file_name in glob.glob(directory_pattern):
        with open(file_name, 'r') as file:
            data = json.load(file)
            data["file_name"] = file_name
            data["experiment_name"] = Path(file_name).stem
            all_data.append(data)

    return all_data

def write_merged_file(output_file, data):
    with open(output_file, 'w') as file:
        json.dump(data, file, indent=4)



try:
    os.mkdir("./testing/testset/")
except:
    pass

async def handle(request):
    data = await request.json()

    # remove save command
    if "cmd" in data:
        del data["cmd"]

    # remove classifier data (not needed)
    data["query"] = data["classifierData"]["query"]
    data["scope"] = data["classifierData"]["scope"]
    del data["classifierData"]

    # merge splits and classifier data for easier json manipulation
    splits = data["splits"]
    classification = data["classification"]
    data["labeled_splits"] = [(c,s) for (c,s) in zip(classification, splits)]
    del data["splits"]
    del data["classification"]


    date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    file_name = f"./testing/testset/{date_str}.json"
    with open(file_name, 'w') as file:
        json.dump(data, file, indent=4)
    print("writing file", file_name)

    # write merged file
    merged_data = merge_json_files('./testing/testset/*.json')
    write_merged_file('./src/assets/merged_testset.json', merged_data)

    return web.Response(text=f"Data saved to {file_name}")



async def gettestset(request):
    merged_data = merge_json_files('./testing/testset/*.json')
    return web.json_response(merged_data)




async def hello(request):
    return web.Response(text=f"world")

app = web.Application()
app.add_routes([web.get('/hello', hello)])
app.add_routes([web.post('/save', handle)])
app.add_routes([web.get('/gettestset', gettestset)])

if __name__ == '__main__':
    web.run_app(app, port=9901)
