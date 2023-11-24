from aiohttp import web
import json
import datetime
import os

try:
    os.mkdir("./testset/")
except:
    pass

async def handle(request):
    data = await request.json()
    date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    file_name = f"./testset/{date_str}.json"
    with open(file_name, 'w') as file:
        json.dump(data, file, indent=4)
    print("writing file", file_name)
    return web.Response(text=f"Data saved to {file_name}")

async def hello(request):
    return web.Response(text=f"world")

app = web.Application()
app.add_routes([web.get('/hello', hello)])
app.add_routes([web.post('/save', handle)])

if __name__ == '__main__':
    web.run_app(app, port=9901)
