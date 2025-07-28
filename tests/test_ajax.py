import pytest

from core.ajax_ai import build_default_ajax


def test_ajax_mode_response():
    ajax = build_default_ajax()
    ajax.is_logan_present = True
    message = "Schedule my meeting"
    reply = ajax.generate_response(message)
    # The reply should include the original message and start with the assistant phrase
    assert message in reply
    assert reply.startswith(ajax.personalities["ajax"].example_phrases[0])


def test_logan_mode_response():
    ajax = build_default_ajax()
    ajax.is_logan_present = False
    message = "I appreciate your interest"
    reply = ajax.generate_response(message)
    # The reply should include the original message and start with the Logan phrase
    assert message in reply
    assert reply.startswith(ajax.personalities["logan"].example_phrases[0])


def test_delegate_to_agent():
    ajax = build_default_ajax()
    # Delegate to investor agent
    task = "Analyze TSLA earnings"
    result = ajax.delegate("investor", task)
    assert "[InvestorAgent]" in result
    assert task in result
    # Delegate to fanpage agent
    task2 = "Create engaging TikTok content"
    result2 = ajax.delegate("fanpage", task2)
    assert "[FanpageAgent]" in result2
    assert task2 in result2


def test_toggle_presence():
    ajax = build_default_ajax()
    message = "Test message"
    # Ajax mode
    ajax.is_logan_present = True
    reply_ajax = ajax.generate_response(message)
    # Logan mode
    ajax.is_logan_present = False
    reply_logan = ajax.generate_response(message)
    # Responses should differ and start with appropriate phrases
    assert reply_ajax != reply_logan
    assert reply_ajax.startswith(ajax.personalities["ajax"].example_phrases[0])
    assert reply_logan.startswith(ajax.personalities["logan"].example_phrases[0])
