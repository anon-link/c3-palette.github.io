import time
import random
import string
import os
import copy

from trials_data import trials_data, training_data, distractors_data

from concurrent.futures import ThreadPoolExecutor

from flask import Flask, request, render_template, redirect, url_for, make_response

app = Flask(__name__)
executor = ThreadPoolExecutor(2)

taskId = 0
taskNames = ["coSaliency", "coSeparability"]
print("task is ", taskNames[taskId])

groupId = 0  # random.randint(0, len(pairs_array)-1)
print("group id is ", groupId)

groups_trials_data = []
for group_id in range(6):
    group_trials_data = []
    for index, item in enumerate(trials_data):
        trial = copy.deepcopy(item)
        trial["assignmentId"] = (group_id+index % 6) % 6
        # print(group_id, trial["file_id"], trial["assignmentId"])
        trial["options"] = item["options"][trial["assignmentId"]]
        group_trials_data.append(trial)
    # adding distractors
    for index, item in enumerate(distractors_data):
        trial = copy.deepcopy(item)
        trial["assignmentId"] = -1
        # print(group_id, trial["fileId"], trial["assignmentId"])
        # using Tableau 20 ours assignment
        trial["options"] = item["options"][3]
        group_trials_data.append(trial)
    groups_trials_data.append(group_trials_data)


scatterplots_data = groups_trials_data[groupId]

training_trials_number = len(training_data)
scatterplot_options = range(3, 13)


def get_shuffle_order(length):
    l_range = list(range(0, length))
    random.seed(0)
    random.shuffle(l_range)
    return l_range


scatterplot_shuffle_order = get_shuffle_order(len(scatterplots_data))
scatterplot_shuffle_order.insert(20, -1) # break after 20 trials


def append_to_file(filepath, line):
    with open(filepath, 'a') as outfile:
        outfile.write(line+'\n')


def generateRandomCode():
    src_digits = string.digits  # string_数字
    src_uppercase = string.ascii_uppercase  # string_大写字母
    src_lowercase = string.ascii_lowercase  # string_小写字母

    # 随机生成数字、大写字母、小写字母的组成个数（可根据实际需要进行更改）
    digits_num = random.randint(1, 6)
    uppercase_num = random.randint(1, 8-digits_num-1)
    lowercase_num = 8 - (digits_num + uppercase_num)
    # 生成字符串
    password = random.sample(src_digits, digits_num) + random.sample(
        src_uppercase, uppercase_num) + random.sample(src_lowercase, lowercase_num)
    # 打乱字符串
    random.shuffle(password)
    # 列表转字符串
    new_password = ''.join(password)

    return new_password


if(not os.path.exists('static/data/userList.csv')):
    executor.submit(append_to_file, 'static/data/userList.csv',
                    ','.join(("workerId", "startTime")))
if(not os.path.exists('results/user_info.csv')):
    executor.submit(append_to_file, 'results/user_info.csv',
                    ','.join(("workerId", "age", "gender", "degree", "screenSize", "familiar", "comment", "code", "endTime")))


@app.route('/user_info', methods=['POST'])
def user_info():
    code = generateRandomCode()
    executor.submit(append_to_file, 'results/user_info.csv',
                    ','.join((str(request.cookies.get('username')), str(request.form['age']), str(request.form['sex']),
                              str(request.form['degree']), str(request.form['screen_size']), str(
                                  request.form['vis_experience']),
                              "\""+str(request.form['comment_additional'])+"\"", str(code), time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))))
    return render_template('thankyou.html', code=code)


@app.route('/consent_info', methods=['POST'])
def consent_info():
    executor.submit(append_to_file, 'static/data/userList.csv', ','.join(
        (str(request.form['workerId']), time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))))

    resp = make_response(redirect(url_for('instruction')))
    resp.set_cookie('username', request.form['workerId'])
    if taskId == 0:
        filename = str(groupId)+'-coSaliency_task_result-' + \
            str(request.form['workerId']) + '.csv'
        executor.submit(append_to_file, 'results/'+filename,
                        ','.join(("userName", "fileId", "conditionId", "changeMagnitude", "changeType", "clickOrder", "clickClusterType", "clickTime", "userResult", "rightAnswer", "totalTime")))
    if taskId == 1:
        filename = str(groupId)+'-coSeparability_task_result-' + \
            str(request.form['workerId']) + '.csv'
        executor.submit(append_to_file, 'results/'+filename,
                        ','.join(("userName", "fileId", "conditionId", "changeMagnitude", "userResult", "totalTime")))

    return resp


################################
# Co-Saliency Task
################################
@app.route('/result/1', methods=['POST'])
def write_result_to_disk1():
    filename = str(groupId)+'-coSaliency_task_result-' + \
        request.cookies.get('username') + '.csv'

    test_id = int(request.form['test_id'])
    total_time = request.form.get('total_time', str(0))
    click_order_str = request.form.get('clickOrder', str(0))
    click_time = request.form.get('clickTime', str(0))
    result = request.form.get('result', str(0))  # default value 0
    num = scatterplot_shuffle_order[test_id-1]
    trial_data = scatterplots_data[num]
    # collect click information
    change_type = trial_data["change_type"]
    change_magnitude = trial_data["magnitude"]
    click_cluster_type = []
    click_order = click_order_str.split('-')
    for click_id in click_order:
        if click_id != '':
            click_id = int(click_id)
        click_flag = 0
        for cluster in trial_data["change_info"]:
            if cluster["cluster_id"] == click_id:
                click_flag = 1
                click_cluster_type.append(cluster["cluster_type"])
        if click_flag == 0:
            click_cluster_type.append(0)

    executor.submit(append_to_file, 'results/'+filename,
                    ','.join((request.cookies.get('username'), str(trial_data["file_id"]), str(trial_data["assignmentId"]), str(change_magnitude), str(change_type), click_order_str, '-'.join(str(x) for x in click_cluster_type), click_time, result, '-'.join(str(x["cluster_id"]) for x in trial_data["change_info"]), total_time)))

    return url_for('experiment1', test_id=test_id+1)


@app.route('/experiment/1/')
@app.route('/experiment/1/<int:test_id>')
def experiment1(test_id=1):
    if test_id == 21:
        return render_template('shortBreak.html', expId=1, testId=test_id+1)
    if test_id > len(scatterplot_shuffle_order):
        return render_template('form.html')

    trial_id = scatterplot_shuffle_order[test_id-1]
    trial_data = scatterplots_data[trial_id]
    test_num = len(scatterplots_data)

    return render_template('coSaliency-test.html', test_id=test_id,
                           trialData=trial_data,
                           test_num=test_num)


@app.route('/experiment/1/training/')
@app.route('/experiment/1/training/<int:training_id>')
def experiment1_training(training_id=1):
    if training_id > training_trials_number:
        return render_template('start_experiment.html', taskName=taskNames[taskId])

    trial_data = training_data[training_id-1]

    return render_template('coSaliency-train.html', training_id=training_id,
                           trialData=trial_data,
                           training_num=training_trials_number)


################################
# Co-Separability Task
################################
@app.route('/result/2', methods=['POST'])
def write_result_to_disk2():
    filename = str(groupId)+'-coSeparability_task_result-' + \
        request.cookies.get('username') + '.csv'

    test_id = int(request.form['test_id'])
    total_time = request.form.get('total_time', str(0))
    result = request.form.get('result', str(0))  # default value 0
    num = scatterplot_shuffle_order[test_id-1]
    trial_data = scatterplots_data[num]

    executor.submit(append_to_file, 'results/'+filename,
                    ','.join((request.cookies.get('username'), str(trial_data["file_id"]), str(trial_data["assignmentId"]), str(trial_data["magnitude"]), result, total_time)))

    return url_for('experiment2', test_id=test_id+1)


@app.route('/experiment/2/')
@app.route('/experiment/2/<int:test_id>')
def experiment2(test_id=1):
    if test_id == 21:
        return render_template('shortBreak.html', expId=2, testId=test_id+1)
    if test_id > len(scatterplot_shuffle_order):
        return render_template('form.html')

    trial_id = scatterplot_shuffle_order[test_id-1]
    trial_data = scatterplots_data[trial_id]
    test_num = len(scatterplots_data)

    return render_template('coSeparability-test.html', test_id=test_id,
                           trialData=trial_data,
                           options=scatterplot_options,
                           test_num=test_num)


@app.route('/experiment/2/training/')
@app.route('/experiment/2/training/<int:training_id>')
def experiment2_training(training_id=1):
    if training_id > training_trials_number:
        return render_template('start_experiment.html', taskName=taskNames[taskId])

    trial_data = training_data[training_id-1]

    return render_template('coSeparability-train.html', training_id=training_id,
                           trialData=trial_data,
                           options=scatterplot_options,
                           training_num=training_trials_number)


@app.route('/thankyou')
def thankyou():
    return app.send_static_file('thankyou.html')


@app.route('/userstudy')
def userstudy():
    return render_template('consent.html', taskName=taskNames[taskId])


@app.route('/instruction')
def instruction():
    html_name = 'instruction.html'
    return render_template(html_name, trialsNum=len(scatterplots_data), taskName=taskNames[taskId])


@app.route('/userguide/<int:experiment_id>')
def userguide(experiment_id):
    html_name = 'guide.html'
    return render_template(html_name, taskName=taskNames[taskId])


@app.route('/')
def index():
    return redirect(url_for('userstudy'))


if __name__ == '__main__':
    app.run(host='0.0.0.0')
