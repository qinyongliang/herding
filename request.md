将此mcp改成成一个可执行的js脚本。名称为sleepdog。含义为牧羊犬，目的是为了监督AI更好的进行开发
思路为：

- 根据调用时指定的名称来判定导航到哪个实现（若不匹配，默认走get-project-info)。就像busybox那样一个程序通过不同的快捷方式调用时呈现不同的实现
- 将其中mcp的描述原封不动的抽离成一个cursorRule
- 移除mcp中的路径参数，直接获取当前路径
- 移除初始化的入口。在get-project-info时若发现对应的文件夹未创建，就走初始化的流程
- get-project-info返回值额外添加：当天git config user.name的值，以及当前时间
- > 初始化流程除了原有的流程之外，额外添加：
-     - 判断当前系统类型。找到自己文件所在位置。为所有的命令创建独立的快捷方式指向自己（如果快捷方式不存在时）
- 移除update-project-info。
- 实现一个plan工具。流程为：获取PPID，创建一个.sleepdog/task/${PPID}-todo.md的空文件。并返回以下文字内容：你需要在.sleepdog/task/${PPID}-todo.md中记录和拆分你接下来要完成的工作，并以此一步一步执行下去
- 实现ask_user工具(参考@ask_user文件。不过使用js来实现）。
    - 如果工具返回值为空，则判断.sleepdog/task/${PPID}-todo.md文件是否存在且其中是否还有未被勾选的完成项。使用使用字符匹配[]找到该行，并响应内容：在.sleepdog/task/${PPID}-todo.md找到尚未完成的任务：${未完成的任务行}。请继续
        - 否者则认为任务完成。返回原有update-project-info的返回值

注意：你所有的输出都是针对cursor的，内容需要严肃清晰表达。绝对不要有任何emoji

