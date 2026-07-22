import os
import re

directories = ["english", "hindi"]
base_dir = r"c:\Projects\solobuildProjects\pipecat-quickstart\server"

for dir_name in directories:
    dir_path = os.path.join(base_dir, dir_name)
    if os.path.exists(dir_path):
        for filename in os.listdir(dir_path):
            if filename.endswith(".py"):
                filepath = os.path.join(dir_path, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = re.sub(r'silence_duration_ms=\d+', 'silence_duration_ms=300', content)
                new_content = re.sub(r'thinking=\{"thinking_budget": \d+\}', 'thinking={"thinking_budget": 0}', new_content)
                
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
