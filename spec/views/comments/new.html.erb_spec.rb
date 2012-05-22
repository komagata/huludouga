require 'spec_helper'

describe "comments/new" do
  before(:each) do
    assign(:comment, stub_model(Comment,
      :body => "MyText",
      :movie_id => 1,
      :position => 1
    ).as_new_record)
  end

  it "renders new comment form" do
    render

    # Run the generator again with the --webrat flag if you want to use webrat matchers
    assert_select "form", :action => comments_path, :method => "post" do
      assert_select "textarea#comment_body", :name => "comment[body]"
      assert_select "input#comment_movie_id", :name => "comment[movie_id]"
      assert_select "input#comment_position", :name => "comment[position]"
    end
  end
end
